# AFrame-surface-scatter

[Demo](https://ada.is/aframe-surface-scatter)

![Screenshot of a 3D rendered field of grass with flowers](https://user-images.githubusercontent.com/4225330/176483332-1135d75d-d1fe-4e30-87ce-5852e2ce5c34.png)


## Simple Example
```html
<a-cylinder radius="0.02" height="0.04" color="red"></a-cylinder>
<a-sphere radius="0.5" position="0 1 -2" surface-scatter="object:#decoration;count:800;"><a-sphere>
```

You can use multiple `surface-scatter` components by appending `__name` to the component e.g. 

```html
<a-sphere radius="0.5" surface-scatter__flowers="object:#flowers;count:800;" surface-scatter__trees="object:#trees;count:20;"><a-sphere>
```

<!--DOCS-->
### surface-scatter component

This component uses instancing to cover one object in another.

| Property        | Type     | Description                                                                                                                                                                                                                                                                                                                               | Default |
| :-------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| object          | selector | Object to place on the surface of this object                                                                                                                                                                                                                                                                                             |         |
| count           | number   | Amount of objects                                                                                                                                                                                                                                                                                                                         | 128     |
| weightAttribute | string   | Specifies a vertex attribute to be used as a weight when sampling from the surface. Faces with higher weights are more likely to be sampled, and those with weights of zero will not be sampled at all. For vector attributes, only .x is used in sampling. If no weight attribute is selected, sampling is randomly distributed by area. | ""      |
| scale           | vec3     | Amount to scale the objects by                                                                                                                                                                                                                                                                                                            | {}      |
| rotation        | vec3     | Amount to rotate the objects by                                                                                                                                                                                                                                                                                                           | {}      |
| scaleJitter     | vec3     | Add randomness to the scaling                                                                                                                                                                                                                                                                                                             | {}      |
| rotationJitter  | vec3     | Add randomness to the rotation                                                                                                                                                                                                                                                                                                            | {}      |
| uniformJitter   | boolean  | Scale x,y,z together (true) or each independently (false)                                                                                                                                                                                                                                                                                 | true    |

<!--DOCS_END-->
